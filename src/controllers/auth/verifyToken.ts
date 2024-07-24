import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { secretKey } from '../../../index';

export default function verifyToken(req: Request, res: Response, next: NextFunction) {
	let token = req.cookies.token || req.headers.authorization;
	if (!token) {
		return res.status(403).json({ error: true, message: 'Access denied' });
	}

	// Verify the token
	jwt.verify(token, secretKey, (err: any, decoded: any) => {
		if (err) {
			return res.status(403).json({ error: true, message: 'Access denied' });
		}
		req.body.user = decoded;
		next();
	});
}
