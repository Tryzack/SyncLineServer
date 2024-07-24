import { Request, Response } from 'express';
import { firebaseComponent } from '../../index';
import multer from 'multer';

const upload = multer(); // in prod use firebase storage instead

export async function uploadFile(req: Request, res: Response) {
	upload.any()(req, res, async (err) => {
		if (err) {
			return res.status(500).json({ message: 'Error uploading file' });
		}
		const formData = req.body;
		const files = req.files as Express.Multer.File[];
		// Do something with the formData
		console.log(formData);

		// first, get file extension
		const file = files[0];
		const url = await firebaseComponent.uploadFile(file);

		// respond to the client
		res.status(200).json({ message: 'File uploaded successfully', url: url });
	});
}
