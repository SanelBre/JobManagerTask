import { Router } from 'express';
import { Op } from 'sequelize';

import { Profile } from '../model.js';
import { sortByObjectValues } from '../utils/sortByObjectValues.js';

const router = Router();

router.get('/admin/best-profession', async (req, res) => {
	const { Job, Contract } = req.app.get('models');

	const startDate = req.query.start && new Date(req.query.start);

	const endDate = req.query.end && new Date(req.query.end);

	const jobs = await Job.findAll({
		where: {
			paid: true,
			'$Contract.status$': 'in_progress',
			paymentDate: {
				[Op.between]: [
					startDate ? new Date(startDate) : new Date(0),
					endDate ? new Date(endDate) : new Date(),
				],
			},
		},
		include: [
			{
				model: Contract,
				as: 'Contract',
			},
		],
	});

	const contracts = await Contract.findAll({
		where: {
			id: {
				[Op.in]: jobs.map((job) => job.Contract.id),
			},
		},
		include: [
			{
				model: Profile,
				as: 'Contractor',
			},
			{
				model: Job,
			},
		],
	});

	const map = {};

	contracts.forEach((con) => {
		const sum = con.Jobs.reduce((p, c) => p + c.price, 0);

		map[con.Contractor.profession] =
			(map[con.Contractor.profession] ?? 0) + sum;
	});

	const sorted = sortByObjectValues(map);

	return res.status(200).send(sorted);
});

router.get('/admin/best-clients', async (req, res) => {
	const { Job, Contract, Profile } = req.app.get('models');

	const startDate = req.query.start && new Date(req.query.start);

	const endDate = req.query.end && new Date(req.query.end);

	const limit = isNaN(Number(req.query.limit)) ? 2 : Number(req.query.limit);

	const jobs = await Job.findAll({
		limit,
		where: {
			paid: true,
			'$Contract.status$': 'in_progress',
			paymentDate: {
				[Op.between]: [
					startDate ? new Date(startDate) : new Date(0),
					endDate ? new Date(endDate) : new Date(),
				],
			},
		},
		include: [
			{
				model: Contract,
				as: 'Contract',
			},
		],
	});

	const map = {};

	await Promise.all(
		jobs.map(async (job) => {
			const clientId = job.Contract.ClientId;

			const client = await Profile.findOne({ where: { id: clientId } });

			const fullName = `${client.firstName} ${client.lastName}`;

			map[fullName] = (map[fullName] ?? 0) + job.price;
		})
	);

	const sorted = sortByObjectValues(map);

	res.send(sorted);
});

export { router as AdminRouter };
