import Joi from '@hapi/joi';

export const inputSchema: any = Joi.object({
  id: Joi.string().hex().length(40).required(),
  notes: Joi.array(),
});
