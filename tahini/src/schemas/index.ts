import Joi from '@hapi/joi';

export const keySchema: any = Joi.object({
  id: Joi.string().hex().length(40).required(),
  informationKey: Joi.string().required(),
});

export const noteSchema: any = Joi.object({
  note: Joi.object({
    id: Joi.string().hex().length(40).required(),
    owner: Joi.string().hex().length(40).required(),
    viewingKey: Joi.string().required(),
  }),
});
