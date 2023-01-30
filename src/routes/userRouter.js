import { Router } from 'express';
import { Op } from 'sequelize';

import { Contract } from '../model.js';

const router = Router();

router.get('/user/:id', async (req, res) => {
	const { Profile } = req.app.get('models');

	const { id } = req.params;

	const user = await Profile.findOne({ where: { id } });

	if (!user) return res.status(404).end();

	res.json(user);
});

router.post('/balances/deposit/:userId', async (req, res) => {
	const { Job, Profile } = req.app.get('models');

	const client = await Profile.findOne({
		where: { id: req.params.userId, type: 'client' },
	});

	if (!client) return res.status(404).send({ message: 'Client not found!' });

	const amount = req.body?.amount;

	if (isNaN(amount))
		return res.status(400).send({ message: 'Invalid amount!' });

	if (amount <= 0)
		return res
			.status(400)
			.send({ message: 'Amount has to be a positive number.' });

	const unpaidJobs = await Job.findAll({
		where: {
			paid: { [Op.not]: true },
			'$Contract.ClientId$': client.id,
			'$Contract.status$': 'in_progress',
		},
		include: [
			{
				model: Contract,
				as: 'Contract',
				attributes: [],
			},
		],
	});

	const totalPrice = unpaidJobs.reduce((sum, job) => sum + job.price, 0);

	const limitDepositValue = ((totalPrice * 25) / 100).toFixed(2);

	if (amount > limitDepositValue)
		return res.status(400).send({
			message: `Amount can not be grater then 25% of total unpaid job prices (<${limitDepositValue})`,
		});

	client.balance = (client.balance + amount).toFixed(2);

	await client.save();

	res.status(200).send();
});

export { router as UserRouter };
