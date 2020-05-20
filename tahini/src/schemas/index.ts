import Joi from '@hapi/joi';

const noteSchema: any = Joi.object({
    note: Joi.object({
      id: Joi.string().hex().length(40).required(),
      owner: Joi.string().hex().length(40).required(),
      viewingKey: Joi.string().required(),
    }),
  });

export const notesSchema: any = Joi.object({
  notes: Joi.object({ noteSchema }),
});

export const keySchema: any = Joi.object({
    id: Joi.string().hex().length(40).required(),
    informationKeys: Joi.array().items(Joi.string()),
  });
  


