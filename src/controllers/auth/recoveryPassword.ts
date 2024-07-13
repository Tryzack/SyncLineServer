import { findOne, updateOne } from '../../utils/dbComponent';
import { mailer } from '../../../index';
import * as resetKeys from '../../utils/resetKeys';
import bcrypt from 'bcrypt';
import { Request, Response } from 'express';

/**
 * Send recovery code to user email
 * @param {string} req.body.email - Required
 * @returns {Object} -Response
 */
export async function sendRecoveryCode(req: Request, res: Response): Promise<Response> {
	const email = req.body.email;
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!email) return res.status(400).json({ message: 'Email is required' });
	if (typeof email !== 'string')
		return res.status(400).json({ message: 'Email must be a string' });
	if (!emailRegex.test(email)) return res.status(400).json({ message: 'Invalid email' });

	const keys = resetKeys.getResetKeys();
	const user = await findOne('users', { email: email });
	if (user.error) return res.status(500).json({ message: 'Internal server error' });
	if (!user.result || Object.keys(user.result).length === 0)
		return res.status(404).json({ message: 'User not found' });
	if (keys[user.result._id]) return res.status(200).json({ message: 'Code already sent' });

	const code = Math.floor(100000 + Math.random() * 900000);
	resetKeys.setResetKey(user.result._id, { key: code, email });
	const subject = 'SyncLine Password recovery';
	const body = `
		<html>
	<head>
		<style>
			body {
			  font-family: Arial, sans-serif;
			  line-height: 1.5;
			}
			h2 {
			  color: #cf6b6b;
			}
			p {
			  margin-bottom: 10px;
			}
			strong {
			  color: #007bff;
			}
		</style>
	</head>
	<body>
		<h2>Password Recovery</h2>
		<p>Dear User,</p>
		<p>We have received a request for password recovery for your account.</p>
		<p>Your recovery code is:</p>
		<div style="
		display: flex; 
		background-color: #316fad; 
		padding: 10px; 
		margin: 0 auto; 
		height: 30px; 
		width: 50%;"
		>
			<p style="
			font-size: 20px;
			color: white;
			text-align: center;
            margin: 0;
			width: 100%;
			">${code}<p>
		</div>
		<p>Please use this code to reset your password. This code will expire in 10 minutes.</p>
		<p>If you did not request this password recovery, please ignore this email.</p>
		<p>Thank you,</p>
		<p style="color: #2b960b">ContactSync Team</p>
	</body>
</html>
`;
	const type = 'html';
	await mailer.sendEmail({ email, subject, body, type });
	setTimeout(() => {
		if (keys[user.result._id]) delete keys[user.result._id];
	}, 600000); // 10 minutes
	return res.status(200).json({ message: 'Recovery code sent' });
}

/**
 * Check if recovery code is valid
 * @param {string} req.body.email - Required
 * @param {string} req.body.code - Required
 * @returns {Object} -Rresponse
 */
export async function recoveryCode(req: Request, res: Response): Promise<Response> {
	let { email, code } = req.body;
	if (!email || !code) {
		return res.status(400).json({ message: 'Email and code are required' });
	}
	if (typeof email !== 'string' || typeof code !== 'string') {
		return res.status(400).json({ message: 'Email and code must be strings' });
	}
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	email = email.trim();
	code = code.trim();
	if (!emailRegex.test(email)) {
		return res.status(400).json({ message: 'Invalid email' });
	}

	try {
		const user = await findOne('users', { email });
		if (user.error) return res.status(500).json({ message: 'Internal server error' });

		if (!user.result || Object.keys(user.result).length === 0)
			return res.status(404).send({ message: 'User not found' });

		const keys = resetKeys.getResetKeys();
		if (!keys[user.result._id]) return res.status(404).send({ message: 'Code not found' });

		return res.status(200).json({ message: 'Code is valid' });
	} catch (error) {
		return res.status(500).json({ message: 'Internal server error' });
	}
}

/**
 * Change password of a user after veryfying the recovery code
 * @param {string} req.body.email - Required
 * @param {string} req.body.code - Required
 * @param {string} req.body.password - Required
 */
export async function recoveryPassword(req: Request, res: Response): Promise<Response> {
	let { email, code, password } = req.body;
	if (!email || !code || !password) {
		return res.status(400).json({ message: 'Email, code and password are required' });
	}
	if (typeof email !== 'string' || typeof code !== 'string' || typeof password !== 'string') {
		return res.status(400).json({ message: 'Email, code and password must be strings' });
	}
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	email = email.trim();
	code = code.trim();
	password = password.trim();
	if (!emailRegex.test(email)) {
		return res.status(400).json({ message: 'Invalid email' });
	}

	const user = await findOne('users', { email });
	if (user.error) return res.status(500).json({ message: 'Internal server error' });

	if (!user.result || Object.keys(user.result).length === 0)
		return res.status(404).send({ message: 'User not found' });

	const keys = resetKeys.getResetKeys();
	if (!keys[user.result._id]) return res.status(404).send({ message: 'Code not found' });

	if (keys[user.result._id].key !== code)
		return res.status(401).json({ message: 'Invalid code' });

	const hashedPassword = await bcrypt.hash(password, 10);
	const updated = await updateOne(
		'users',
		{ _id: user.result._id },
		{ password: hashedPassword }
	);
	if (updated.error) return res.status(500).json({ message: 'Internal server error' });

	delete keys[user.result._id];
	return res.status(200).json({ message: 'Password updated' });
}
