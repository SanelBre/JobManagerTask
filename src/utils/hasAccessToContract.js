export const hasAccessToContract = (contract, userId) =>
	contract.ClientId !== userId && contract.ContractorId !== userId;
