import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tokensRouter from "./tokens";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tokensRouter);
router.use(storageRouter);

export default router;
