import { Router } from "express";
import { login, register, checkSession, unregister, logout } from "../controllers/auth/auth";
import { recoveryCode, recoveryPassword, sendRecoveryCode } from "../controllers/auth/recoveryPassword";
import verifyToken from "../controllers/auth/verifyToken";
const router: Router = Router();

router.get("/auth/checkSession", verifyToken, checkSession);
router.post("/auth/login", login);
router.post("/auth/register", register);
router.delete("/auth/unregister", verifyToken, unregister);
router.get("/auth/logout", logout);

router.post("/recovery/sendCode", sendRecoveryCode);
router.post("/recovery/verifyCode", recoveryCode);
router.put("/recovery/changePassword", recoveryPassword);

export default router;
