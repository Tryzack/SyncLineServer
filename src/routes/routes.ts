import { Router } from 'express';
import { login, register, checkSession, unregister, logout } from '../controllers/auth/auth';
import {
	recoveryCode,
	recoveryPassword,
	sendRecoveryCode
} from '../controllers/auth/recoveryPassword';
import { getGroups, getGroup, createGroup, deleteGroup, updateGroup } from '../controllers/group';
import verifyToken from '../controllers/auth/verifyToken';
const router: Router = Router();

router.get('/auth/checkSession', verifyToken, checkSession);
router.post('/auth/login', login);
router.post('/auth/register', register);
router.delete('/auth/unregister', verifyToken, unregister);
router.get('/auth/logout', logout);

router.post('/recovery/sendCode', sendRecoveryCode);
router.post('/recovery/verifyCode', recoveryCode);
router.put('/recovery/changePassword', recoveryPassword);

router.get('/get/group', verifyToken, getGroups);
router.get('/get/group/:groupId', verifyToken, getGroup);
router.post('/insert/group', verifyToken, createGroup);
router.delete('/delete/group/:groupId', verifyToken, deleteGroup);
router.put('/update/group/:groupId', verifyToken, updateGroup);

export default router;
