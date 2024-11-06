// Configurations de Middlewares
import express from 'express';
import https from 'https';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { setupSwagger } from './swagger';
import morgan from 'morgan';
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser';
import { envs } from './core/config/env';
import disableLogsInProduction from './middleware/disableLog';
import log from './core/config/logger';
import user from './routes/users-route';
import deleteInvalidUser from './services/jobs/deleteUnverifiedUsers';
import abscence from './routes/abscences-route';
import attendance from './routes/attendances-route';
import updateEmployeeStatus from './services/jobs/updateStatusEmployee';
import deleteExpiredTokens from './services/jobs/deleteAllExpiredToken';
import notifiedEmployeeSalary from './services/jobs/sendEmployeeSalary';
import keys from './core/config/key';
import redirectURL from './middleware/redirectUrl';

const app = express();

// Desactiver les logs de console en production
app.use(disableLogsInProduction); // Middleware pour désactiver les logs

// Configurations de securité
app.use(helmet.hsts({
	maxAge: 63072000, // 2 year to remenber to use Https
	includeSubDomains: true,
	preload: true,
})) //Pour configurer les entete http securisés

app.use(cors({
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
	credentials: true,
})) // Pour gerer le partage des ressources de maniere securisée

// Configuration globaux de l'application express
app.use(express.json()); // parser les requets json
app.use(express.urlencoded({ extended: true })); // parser les requetes url encoder
app.use(compression()); //compression des requetes http
app.use(
	rateLimit({
		max: envs.MAX_GLOBAL_QUERY_NUMBER,
		windowMs: envs.MAX_GLOBAL_QUERY_WINDOW,
		message: 'Trop de Requete à partir de cette adresse IP !'
	})
);//limite le nombre de requete

app.use(cookieParser()); //configuration des cookies (JWT)

// Redirect unsecure URL: Move HTTP to HTTPS
app.use(redirectURL);

// Middleware de journalisation avec Morgan qui utilise Winston
const morganFormatRes = ':method :url  :status :response-time ms' // Format de journalisation 
app.use(morgan(morganFormatRes, {
	stream: {
		write: (message) => log.http(message.trim()) // Redirige les logs HTTP vers Winston
	}
}));

// program routes
app.use(
	"/employees",
	rateLimit({
		max: envs.MAX_UNIQ_QUERY_NUMBER,
		windowMs: envs.MAX_UNIQ_QUERY_WINDOW,
		message: "Trop de requete à partir de cette addresse IP sur ce endPoint !"
	}),
	user
);

app.use(
	"/attendance",
	rateLimit({
		max: envs.MAX_UNIQ_QUERY_NUMBER,
		windowMs: envs.MAX_UNIQ_QUERY_WINDOW,
		message: "Trop de requete à partir de cette addresse IP sur ce endPoint !"
	}),
	attendance
);

app.use(
	rateLimit({
		max: envs.MAX_UNIQ_QUERY_NUMBER,
		windowMs: envs.MAX_UNIQ_QUERY_WINDOW,
		message: "Trop de requete à partir de cette addresse IP sur ce endPoint !"
	}),
	abscence
);

// All the jobs here
deleteInvalidUser.start();
deleteExpiredTokens.start();
updateEmployeeStatus.start();
notifiedEmployeeSalary.start();

// Documentation
setupSwagger(app);

// Creation du server https
const credentials = {
	key: keys.tls.privateKey,
	cert: keys.tls.certificate
}
const httpsServer = https.createServer(credentials, app);

// Export application to app file
export {app, httpsServer};
