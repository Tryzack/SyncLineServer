import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { secretKey, expiresIn } from "../../../index";
import bcrypt from "bcrypt";
import { findOne, insertOne, deleteOne } from "../../utils/dbComponent";
import { ObjectId } from "mongodb";

export async function login(req: Request, res: Response): Promise<Response> {
	let { email, password } = req.body;

	// Check if the email and password are provided
	if (!email || !password) {
		return res.status(400).json({ error: "Email, password are required" });
	}

	// Check if the email and password are strings
	if (typeof email !== "string" || typeof password !== "string") {
		return res.status(400).json({ error: "Invalid request types" });
	}

	// Trim the email and password
	email = email.trim();
	password = password.trim();

	// Find the user in the database
	const { error, message, result } = await findOne("users", { email });
	if (error) {
		return res.status(500).json({ error: true, message });
	}

	// Check if the user exists
	if (!result || Object.keys(result).length === 0) {
		return res.status(404).json({ error: true, message: "User not found" });
	}

	// Compare the password with the hashed password in the database
	if (!(await bcrypt.compare(password, result.password))) {
		return res.status(401).json({ error: true, message: "Invalid password" });
	}

	// Generate token using jwt
	const token = jwt.sign({ userId: result._id }, secretKey, { expiresIn: expiresIn });
	res.cookie("token", token, { httpOnly: true });
	return res.status(200).json({ message: "Logged in successfully", token });
}

export async function register(req: Request, res: Response): Promise<Response> {
	let { email, password, username } = req.body;
	// Check if the email, password and username are provided
	if (!email || !password || !username) {
		return res.status(400).json({ error: true, message: "Email, password and username are required" });
	}

	// Check if the email, password and username are strings
	if (typeof email !== "string" || typeof password !== "string" || typeof username !== "string") {
		return res.status(400).json({ error: true, message: "Invalid request types" });
	}

	// Trim the email, password and username
	email = email.trim();
	username = username.trim();
	password = password.trim();

	const emailRegex: RegExp = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

	if (!emailRegex.test(email)) {
		return res.status(400).json({ error: true, message: "Invalid email" });
	}

	if (password.length < 8) {
		return res.status(400).json({ error: true, message: "Password must be at least 8 characters long" });
	}

	// Hash the password
	const hashedPassword = await bcrypt.hash(password, 10);

	// Save the user to the database and get the user id
	const { error, message, result } = await insertOne("users", { email, username, password: hashedPassword });
	if (error) {
		return res.status(500).json({ error: true, message });
	}

	// Generate token using jwt
	const token = jwt.sign({ userId: result.insertedId }, secretKey, { expiresIn: expiresIn });
	res.cookie("token", token, { httpOnly: true });
	return res.status(200).json({ error: false, message: "Registered successfully" });
}

export function checkSession(req: Request, res: Response): Response {
	return res.status(200).json({ message: "Token is valid" });
}

export function logout(req: Request, res: Response): Response {
	res.clearCookie("token");
	return res.status(200).json({ message: "Logged out successfully" });
}

export async function unregister(req: Request, res: Response): Promise<Response> {
	const userId = req.body.user.userId;
	if (!userId) {
		return res.status(401).json({ error: true, message: "I have no idea how you got here" });
	}
	let { password } = req.body;

	if (!password) {
		return res.status(400).json({ error: true, message: "Email and password are required" });
	}

	if (typeof password !== "string") {
		return res.status(400).json({ error: true, message: "Invalid request types" });
	}

	password = password.trim();

	const { error, message, result } = await findOne("users", { _id: ObjectId.createFromHexString(userId) });

	if (error) {
		return res.status(500).json({ error: true, message });
	}

	if (!result || Object.keys(result).length === 0) {
		return res.status(404).json({ error: true, message: "User not found" });
	}

	if (!(await bcrypt.compare(password, result.password))) {
		return res.status(401).json({ error: true, message: "Invalid password" });
	}

	const { error: deleteError, message: deleteMessage } = await deleteOne("users", { _id: ObjectId.createFromHexString(userId) });
	if (deleteError) {
		return res.status(500).json({ error: true, message: deleteMessage });
	}
	res.clearCookie("token");
	return res.status(200).json({ error: false, message: "User deleted successfully" });
}
