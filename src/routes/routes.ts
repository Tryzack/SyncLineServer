import { Router } from 'express';
import { login, register, checkSession, unregister, logout } from '../controllers/auth/auth';
import {
	recoveryCode,
	recoveryPassword,
	sendRecoveryCode
} from '../controllers/auth/recoveryPassword';
import { createGroup, deleteGroup, updateGroup } from '../controllers/group';
import verifyToken from '../controllers/auth/verifyToken';
import { uploadFile } from '../controllers/uploadFile';
import { getFriends, addFriend, deleteFriend } from '../controllers/friends';
import { getChats, getChatMessages } from '../controllers/chats';

const router: Router = Router();

router.get('/auth/checkSession', verifyToken, checkSession);
router.post('/auth/login', login);
router.post('/auth/register', register);
router.delete('/auth/unregister', verifyToken, unregister);
router.get('/auth/logout', logout);

router.post('/recovery/sendCode', sendRecoveryCode);
router.post('/recovery/verifyCode', recoveryCode);
router.put('/recovery/changePassword', recoveryPassword);

router.post('/insert/group', verifyToken, createGroup);
router.delete('/delete/group/:groupId', verifyToken, deleteGroup);
router.put('/update/group/:groupId', verifyToken, updateGroup);

router.post('/upload', uploadFile);

router.get('/friends', verifyToken, getFriends);
router.post('/friends/add', verifyToken, addFriend);
router.delete('/friends/delete', verifyToken, deleteFriend);

router.get('/chats', verifyToken, getChats);
router.get('/chats/messages', verifyToken, getChatMessages);

export default router;
