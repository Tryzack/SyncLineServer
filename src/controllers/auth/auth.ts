import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { secretKey, expiresIn } from '../../../index';
import bcrypt from 'bcrypt';
import { findOne, insertOne, updateOne, complexUpdateOne } from '../../utils/dbComponent';
import { validateStrings } from '../../utils/otherUtils';
import { ObjectId } from 'mongodb';

export async function login(req: Request, res: Response): Promise<Response> {
	let { email, password } = req.body;

	// Check if the email and password are strings and are provided
	if (!validateStrings([email, password]))
		return res.status(400).json({ error: true, message: 'Invalid email and Password' });

	email = email.trim();
	password = password.trim();

	// Find the user in the database
	const { error, message, result } = await findOne('users', {
		email,
		disabled: { isDisabled: false, timestamp: null }
	});
	if (error) {
		return res.status(500).json({ error: true, message });
	}

	// Check if the user exists
	if (!result || Object.keys(result).length === 0) {
		return res.status(404).json({ error: true, message: 'User not found' });
	}

	// Compare the password with the hashed password in the database
	if (!(await bcrypt.compare(password, result.password))) {
		return res.status(401).json({ error: true, message: 'Invalid password' });
	}

	// Check if the user is disabled
	if (result.disabled.isDisabled) {
		return res.status(403).json({ error: true, message: 'User is deleted' });
	}

	// Generate token using jwt
	const token = jwt.sign({ userId: result._id }, secretKey, {
		expiresIn: expiresIn
	});
	res.cookie('token', token, { httpOnly: true });
	return res.status(200).json({
		message: 'Logged in successfully',
		token,
		userData: {
			username: result.username,
			url: result.url
		}
	});
}

export async function register(req: Request, res: Response): Promise<Response> {
	let { email, password, username, url } = req.body;

	// Check if the email, password and username are strings
	if (!validateStrings([email, password, username]))
		return res.status(400).json({ error: true, message: 'Invalid request types' });

	email = email.trim();
	password = password.trim();
	username = username.trim();

	const emailRegex: RegExp = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

	if (!emailRegex.test(email)) {
		return res.status(400).json({ error: true, message: 'Invalid email' });
	}

	if (password.length < 8) {
		return res.status(400).json({
			error: true,
			message: 'Password must be at least 8 characters long'
		});
	}

	// Hash the password
	const hashedPassword = await bcrypt.hash(password, 10);

	// Check if the someone with the email already exists or the username already exists
	const {
		error: emailError,
		message: emailMessage,
		result: emailResult
	} = await findOne('users', { $or: [{ email }, { username }] });
	if (emailError) {
		return res.status(500).json({ error: true, message: emailMessage });
	}

	if (emailResult) {
		if (emailResult.email === email) {
			return res.status(409).json({ error: true, message: 'Email already exists' });
		} else if (emailResult.username === username) {
			return res.status(409).json({ error: true, message: 'Username already exists' });
		}
	}

	// Save the user to the database and get the user id
	const { error, message, result } = await insertOne('users', {
		email,
		username,
		password: hashedPassword,
		url: typeof url === 'string' ? url : null,
		friends: [],
		disabled: { isDisabled: false, timestamp: null },
		status: []
	});
	if (error) {
		return res.status(500).json({ error: true, message });
	}

	// Generate token using jwt
	const token = jwt.sign({ userId: result.insertedId }, secretKey, {
		expiresIn: expiresIn
	});
	res.cookie('token', token, { httpOnly: true });
	return res.status(200).json({ error: false, message: 'Registered successfully' });
}

export async function updateUser(req: Request, res: Response): Promise<Response> {
	let { email, username, url } = req.body;
	const userId = req.body.user.userId;

	if (!validateStrings([email, username])) {
		return res.status(400).json({ error: true, message: 'Invalid request types' });
	}

	email = email.trim();
	username = username.trim();

	const emailRegex: RegExp = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

	if (!emailRegex.test(email)) {
		return res.status(400).json({ error: true, message: 'Invalid email' });
	}
	console.log(userId);
	const { error, message } = await updateOne('users', { _id: userId }, { email, username, url });
	if (error) {
		return res.status(500).json({ error: true, message });
	}

	return res.status(200).json({ error: false, message: 'User updated successfully' });
}

export async function changePassword(req: Request, res: Response): Promise<Response> {
	let { oldPassword, newPassword } = req.body;
	const userId = req.body.user.userId;

	if (!validateStrings([oldPassword, newPassword])) {
		return res.status(400).json({ error: true, message: 'Invalid request types' });
	}

	oldPassword = oldPassword.trim();
	newPassword = newPassword.trim();

	if (newPassword.length < 8) {
		return res.status(400).json({
			error: true,
			message: 'Password must be at least 8 characters long'
		});
	}

	const { error, message, result } = await findOne('users', { _id: userId });
	if (error) {
		return res.status(500).json({ error: true, message });
	}

	if (!result || Object.keys(result).length === 0) {
		console.log(result);
		return res.status(404).json({ error: true, message: 'User not found' });
	}

	if (!(await bcrypt.compare(oldPassword, result.password))) {
		return res.status(401).json({ error: true, message: 'Invalid old password' });
	}

	const hashedPassword = await bcrypt.hash(newPassword, 10);
	const { error: updateError, message: updateMessage } = await complexUpdateOne(
		'users',
		{
			_id: userId
		},
		{ $set: { password: hashedPassword } }
	);
	if (updateError) {
		return res.status(500).json({ error: true, message: updateMessage });
	}

	return res.status(200).json({ error: false, message: 'Password changed successfully' });
}

export function checkSession(req: Request, res: Response): Response {
	const token = req.cookies.token || req.headers.authorization;
	return res.status(200).json({ message: 'Token is valid', token });
}

export function logout(req: Request, res: Response): Response {
	res.clearCookie('token');
	return res.status(200).json({ message: 'Logged out successfully' });
}

export async function unregister(req: Request, res: Response): Promise<Response> {
	const userId = req.body.user.userId;
	if (!userId) {
		return res.status(401).json({ error: true, message: 'I have no idea how you got here' });
	}

	const { error, message, result } = await findOne('users', { _id: userId });

	if (error) {
		return res.status(500).json({ error: true, message });
	}

	if (!result || Object.keys(result).length === 0) {
		return res.status(404).json({ error: true, message: 'User not found' });
	}

	const { error: deleteError, message: deleteMessage } = await complexUpdateOne(
		'users',
		{
			_id: userId,
			disabled: {
				isDisabled: false,
				timestamp: null
			}
		},
		{ $set: { disabled: { isDisabled: true, timestamp: new Date() } } }
	);
	if (deleteError) {
		return res.status(500).json({ error: true, message: deleteMessage });
	}
	res.clearCookie('token');
	return res.status(200).json({ error: false, message: 'User deleted successfully' });
}
