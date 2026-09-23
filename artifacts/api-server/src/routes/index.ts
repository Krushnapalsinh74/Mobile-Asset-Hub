import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import plansRouter from "./plans";
import paymentsRouter from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(plansRouter);
router.use(paymentsRouter);

export default router;
