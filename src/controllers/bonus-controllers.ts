import { Request, Response } from "express";
import { HttpCode } from "@src/core/constant";
import ResponseMSG from "@src/utils/responseformat";
import exceptions from "@src/utils/errors/exceptions";
import log from "@src/core/config/logger";
import { fetchEmployeeFromParmams } from "@src/utils/helpers/fetchEmployee";
import prisma from "@src/core/config/prismaClient";
import { IFilterWithDate, IPagination, IQueryDate } from "@src/core/interfaces/interfaces";
import DateFilter from "@src/utils/helpers/constructDateFilter";

const bonusControllers = {
    addBonus: async (req: Request, res: Response) => {
        try {
            // Fetch employee data from params
            const employee = await fetchEmployeeFromParmams(req, res);
            if (!employee) return exceptions.badRequest(res, "Employee not found");

            // Fetch bonus amount from body
            const { amount, description } = req.body;

            // add bonus amount
            await prisma.bonus.create({
                data: {
                    employeeID: employee.employee_id,
                    amount,
                    description
                }
            })

            // Return success message
            log.info("All is ok, success !")
            res
                .status(HttpCode.CREATED)
                .json(ResponseMSG(`Employee bonus successfuy added !`));
        } catch (error) {
            log.error("error occured when saving end of attendance !")
            return exceptions.serverError(res, error);
        }
    },

    getBonus: async (req: Request, res: Response) => {
        try {
            // Fetch employee data from params
            const employee = await fetchEmployeeFromParmams(req, res);
            if (!employee) return exceptions.badRequest(res, "Employee not found");

            // Fetch queries
            const { day, month, year } = req.query as IQueryDate;
            const { page = 1, limit = 10 } = req.query as IPagination;

            // Construct date filter
            const dateFilter: Date | undefined = DateFilter(day, month, year);

            // Definit les conditions de filtre en fonction de la prsence ou non des attendences;
            const whereClause: IFilterWithDate = {
                employeeID: employee?.employee_id
            }
            if (dateFilter) whereClause.date = dateFilter

            // sort by date all the attendances of that employee 
            const AllBonus = await prisma.bonus.findMany({
                where: whereClause,
                orderBy: {
                    date: 'desc'
                },
                select: {
                    amount: true,
                    description: true,
                    date: true,
                },
                take: Number(limit),
                skip: (Number(page) - 1) * Number(limit),
            });

            // Return success message
            log.info("All is ok, success !")
            res
                .status(HttpCode.CREATED)
                .json(ResponseMSG(`Success Operation !`, true, AllBonus));
        } catch (error) {
            log.error("error occured when try getting bonus !")
            return exceptions.serverError(res, error);
        }
    },

    clearBonus: async (_req: Request, res: Response) => {
        try {
           const deleteResult = await prisma.bonus.deleteMany();

            const deletedCount = deleteResult.count;
            log.info(`Successfully deleted ${deletedCount} abscences'.`);

            // Return success message
            log.info("All is ok, success !")
            res
                .status(HttpCode.CREATED)
                .json(ResponseMSG(`All Bonus Successfully Clear !`));
        } catch (error) {
            log.error("error occured when try clear bonus !")
            return exceptions.serverError(res, error);
        }
    }
}
export default bonusControllers;