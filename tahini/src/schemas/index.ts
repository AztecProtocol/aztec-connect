import Joi from '@hapi/joi';

export const inputSchema: any = Joi.object({
  id: Joi.string().hex().required(),
  informationKey: Joi.string().required(),
});
