import { Router } from 'express';
import { getProfile } from '../middleware/getProfile.js';
import { Op } from 'sequelize';
import { hasAccessToContract } from '../utils/hasAccessToContract.js';

const router = Router();

router.get('/contracts', getProfile, async (req, res) => {
	const { Contract } = req.app.get('models');

	const contracts = await Contract.findAll({
		where: {
			status: { [Op.ne]: 'terminated' },
			[Op.or]: [{ ClientId: req.profile.id }, { ContractorId: req.profile.id }],
		},
	});

	res.status(200).send(contracts);
});

router.get('/contracts/:id', getProfile, async (req, res) => {
	const { Contract } = req.app.get('models');

	const { id } = req.params;

	const contract = await Contract.findOne({ where: { id } });

	if (!contract) return res.status(404).end();

	if (hasAccessToContract(contract, req.profile.id))
		return res.status(401).send({
			message: 'You are not authorized!',
		});

	res.json(contract);
});

export { router as ContractRouter };
