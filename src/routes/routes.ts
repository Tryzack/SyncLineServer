import { Router } from 'express';
import { login, register, checkSession, unregister, logout } from '../controllers/auth/auth';
import {
	recoveryCode,
	recoveryPassword,
	sendRecoveryCode
} from '../controllers/auth/recoveryPassword';
import {
	createGroup,
	deleteGroup,
	updateGroup,
	addMembers,
	removeMember
} from '../controllers/group';
import verifyToken from '../controllers/auth/verifyToken';
import { uploadFile } from '../controllers/uploadFile';
import { getFriends, addFriend, deleteFriend } from '../controllers/friends';
import { getChats, getChatMessages } from '../controllers/chats';
import { getStatus, createStatus } from '../controllers/status';
import { editProfile } from '../controllers/auth/profile';

const router: Router = Router();

router.get('/auth/checkSession', verifyToken, checkSession);
router.post('/auth/login', login);
router.post('/auth/register', register);
router.delete('/auth/unregister', verifyToken, unregister);
router.get('/auth/logout', logout);

router.put('/profile/edit', verifyToken, editProfile);

router.post('/recovery/sendCode', sendRecoveryCode);
router.post('/recovery/verifyCode', recoveryCode);
router.put('/recovery/changePassword', recoveryPassword);

router.post('/group/create', verifyToken, createGroup);
router.delete('/group/delete/', verifyToken, deleteGroup);
router.put('/group/update/', verifyToken, updateGroup);
router.post('/group/addMembers', verifyToken, addMembers);
router.delete('/group/removeMember', verifyToken, removeMember);

router.post('/upload', verifyToken, uploadFile);

router.get('/friends', verifyToken, getFriends);
router.post('/friends/add', verifyToken, addFriend);
router.delete('/friends/delete', verifyToken, deleteFriend);

router.get('/chats', verifyToken, getChats);
router.get('/chats/messages', verifyToken, getChatMessages);

router.get('/status', verifyToken, getStatus);
router.post('/status', verifyToken, createStatus);

export default router;
