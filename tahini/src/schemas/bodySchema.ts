import Joi from '@hapi/joi';

export const bodySchema: any = Joi.object({
    id: Joi.string().hex().length(40).required(),
    informationKey: Joi.string().required()
});
