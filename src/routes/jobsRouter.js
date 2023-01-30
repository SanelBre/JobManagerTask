import { Router } from 'express';
import { getProfile } from '../middleware/getProfile.js';
import { Op } from 'sequelize';
import { Contract } from '../model.js';

const router = Router();

router.get('/jobs/unpaid', getProfile, async (req, res) => {
	const { Job } = req.app.get('models');

	const unpaidJobs = await Job.findAll({
		where: {
			paid: { [Op.not]: true },
			[Op.or]: [
				{ '$Contract.ClientId$': req.profile.id },
				{ '$Contract.ContractorId$': req.profile.id },
			],
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

	res.status(200).send(unpaidJobs);
});

router.post('/jobs/:jobId/pay', getProfile, async (req, res) => {
	const { Job, Profile } = req.app.get('models');
	const sequelize = req.app.get('sequelize');

	try {
		await sequelize.transaction(async (t) => {
			const job = await Job.findOne({
				where: {
					id: req.params.jobId,
					'$Contract.ClientId$': req.profile.id,
					'$Contract.status$': 'in_progress',
				},
				include: [
					{
						model: Contract,
						as: 'Contract',
					},
				],
				transaction: t,
			});

			if (!job) throw new Error('NOT_FOUND');

			if (job.paid) throw new Error('ALREADY_PAID');

			const clientId = job.Contract.ClientId;
			const contractorId = job.Contract.ContractorId;
			const [client, contractor] = await Promise.all([
				Profile.findByPk(clientId, { transaction: t }),
				Profile.findByPk(contractorId, { transaction: t }),
			]);

			if (client.balance - job.price < 0) throw new Error('NOT_ENOUGH_FOUNDS');

			client.balance = (client.balance - job.price).toFixed(2);
			contractor.balance = (contractor.balance + job.price).toFixed(2);

			job.paid = true;

			await Promise.all([
				client.save({ transaction: t }),
				contractor.save({ transaction: t }),
				job.save({ transaction: t }),
			]);
		});
		res.status(200).send();
	} catch (e) {
		if (e.message === 'NOT_ENOUGH_FOUNDS')
			return res.status(400).send({ message: 'Insufficient balance.' });
		if (e.message === 'ALREADY_PAID')
			return res.status(400).send({ message: 'Already paid for this job!' });
		if (e.message === 'NOT_FOUND')
			return res.status(404).send({ message: 'Job not found.' });
		res.status(500).send();
	}
});

export { router as JobsRouter };
