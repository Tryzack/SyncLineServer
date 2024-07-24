import admin, { ServiceAccount, storage } from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

export default class FirebaseComponent {
	options: any;
	storage: storage.Storage;
	constructor(serviceAccount: any, bucketUrl: string) {
		admin.initializeApp({
			credential: admin.credential.cert(serviceAccount),
			storageBucket: bucketUrl //storage bucket url
		});
		this.options = {
			action: 'read',
			expires: Date.now() + 1000 * 60 * 60 * 24 * 30 // 30 days
		};
		this.storage = admin.storage();
	}

	private async getDownloadURL(fileName: string): Promise<string> {
		const bucket = this.storage.bucket();
		const file = bucket.file(fileName);
		const url = await file.getSignedUrl(this.options);
		return url[0];
	}

	public async uploadFile(file: Express.Multer.File): Promise<string> {
		const bucket = this.storage.bucket();
		const fileExtension = file.originalname.split('.').pop();
		const fileName = `${uuidv4()}.${fileExtension}`;
		const fileUpload = bucket.file(fileName);
		const stream = fileUpload.createWriteStream({
			metadata: {
				contentType: file.mimetype
			}
		});
		return new Promise((resolve, reject) => {
			stream.on('error', (error) => {
				reject(error);
			});

			stream.on('finish', async () => {
				const url = await this.getDownloadURL(fileName);
				resolve(url);
			});

			stream.end(file.buffer);
		});
	}
}
