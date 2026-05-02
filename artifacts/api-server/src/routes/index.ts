import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ticksRouter from "./ticks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ticksRouter);

export default router;
