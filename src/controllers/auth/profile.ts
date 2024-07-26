import { Request, Response } from 'express';
import { validateStrings } from '../../utils/otherUtils';
import { findOne, updateOne } from '../../utils/dbComponent';
import { ObjectId } from 'mongodb';

export async function editProfile(req: Request, res: Response) {
	const userId = req.body.user.userId;
	if (!userId) {
		return res.status(401).json({ error: true, message: 'I have no idea how you got here' });
	}
	let { username, email, url } = req.body;

	if (!validateStrings([email, url, username])) {
		return res.status(400).json({ error: true, message: 'Invalid input type' });
	}

	const { error, message, result } = await findOne('users', { _id: userId });
	if (error) {
		return res.status(500).json({ error: true, message });
	}

	if (!result || Object.keys(result).length === 0) {
		return res.status(404).json({ error: true, message: 'User not found' });
	}

	const checkUser = await findOne('users', {
		_id: { $ne: ObjectId.createFromHexString(userId) },
		$or: [{ email }, { username }]
	});

	if (checkUser.result && Object.keys(checkUser.result).length > 0) {
		return res.status(400).json({ error: true, message: 'Email or username already in use' });
	}

	const { error: updateError, message: updateMessage } = await updateOne(
		'users',
		{ _id: userId },

		{ username, email, url }
	);
	if (updateError) {
		return res.status(500).json({ error: true, message: updateMessage });
	}
	return res.status(200).json({ error: false, message: 'Profile updated successfully' });
}

export async function checkEmail(req: Request, res: Response) {
	const email = req.body.email;

	const emailResult = await findOne('users', {
		email: email,
		disabled: { isDisabled: false, timestamp: null }
	});
	if (emailResult.error)
		return res.status(500).json({ error: true, message: emailResult.message });

	if (emailResult.result && Object.keys(emailResult.result).length > 0)
		return res.status(409).json({ error: true, message: 'user with email already exists' });

	return res.status(200).json({ error: false, message: 'email available' });
}
