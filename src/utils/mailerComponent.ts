import nodemailer from 'nodemailer';

let senderEmail: string = '';
let password: string = '';

/**
 * Class to send emails
 * @class Mailer
 * @param {string} email - Email to send the email from
 * @param {string} password - Password of the email
 */
export class Mailer {
	private senderEmail: string;
	private password: string;
	constructor(email: string, password: string) {
		this.senderEmail = email;
		this.password = password;
	}

	/**
	 * @param {Object} options
	 * @param {string} email.email - Email to send the email to
	 * @param {string} email.subject - email subject
	 * @param {string} email.body - email body
	 * @param {string} email.type - email type (html or text)
	 * @returns {Promise<string>} - Email response
	 */
	async sendEmail({
		email,
		subject,
		body,
		type
	}: {
		email: string;
		subject: string;
		body: string;
		type: string;
	}): Promise<string> {
		const transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: this.senderEmail,
				pass: this.password
			}
		});

		let mailOptions:
			| {
					from: string;
					to: string;
					subject: string;
					html: string;
			  }
			| {
					from: string;
					to: string;
					subject: string;
					text: string;
			  };
		if (type === 'html')
			mailOptions = {
				from: this.senderEmail,
				to: email,
				subject,
				html: body
			};
		else
			mailOptions = {
				from: this.senderEmail,
				to: email,
				subject,
				text: body
			};

		return new Promise((resolve, reject) => {
			transporter.sendMail(mailOptions, (error, info) => {
				if (error) {
					console.error(error);
					reject('Error sending email');
				} else {
					resolve(info.response);
				}
			});
		});
	}
}
