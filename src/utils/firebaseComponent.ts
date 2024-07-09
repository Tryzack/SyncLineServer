import admin, { ServiceAccount } from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

export default class FirebaseComponent {
	constructor(serviceAccount: any, bucketUrl: string) {
		admin.initializeApp({
			credential: admin.credential.cert(serviceAccount),
			storageBucket: bucketUrl, //storage bucket url
		});
	}

	/* public async uploadFile(file: Express.Multer.File): Promise<string> {
		const bucket = admin.storage().bucket();
		const fileName = uuidv4();
		const fileUpload = bucket.file(fileName);
		const stream = fileUpload.createWriteStream({
			metadata: {
				contentType: file.mimetype,
			},
		});

		return new Promise((resolve, reject) => {
			stream.on("error", (error) => {
				reject(error);
			});

			stream.on("finish", () => {
				resolve(fileName);
			});

			stream.end(file.buffer);
		});
	} */
}
