import { Router } from "express";
import { login, register, checkSession, unregister, logout } from "../controllers/auth/auth";
import verifyToken from "../controllers/auth/verifyToken";
const router: Router = Router();

router.get("/auth/checkSession", verifyToken, checkSession);
router.post("/auth/login", login);
router.post("/auth/register", register);
router.delete("/auth/unregister", verifyToken, unregister);
router.get("/auth/logout", logout);

export default router;
