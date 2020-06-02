import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import compress from 'koa-compress';
import Router from 'koa-router';
import cors from '@koa/cors';

import { Note } from './entity/Note';

import { inputValidation, createValidateSignature } from './middleware';
import Server from './server';

export function appFactory(server: Server, prefix: string) {
    const validateSignature = createValidateSignature(server.schnorr);

    const router = new Router({ prefix });

    const noteRepo = server.connection.getRepository(Note);

    router.get('/', async (ctx: Koa.Context) => {
        ctx.body = 'OK\n';
    });

    router.post(
        '/account/new',
        inputValidation,
        validateSignature,
        async (ctx: Koa.Context, next: Function) => {
            const { id, informationKey } = ctx.request.body;
            const newKey = await server.keyDb.addKey(id, informationKey);

            if (!newKey) {
                ctx.response.status = 400;
                next();
            }

            ctx.response.status = 201;

            // notify server of new key
            await server.registerNewKey(informationKey);
        },
    );

    router.put(
        '/account/:id',
        validateSignature,
        async (ctx: Koa.Context) => {
            const { id } = ctx.params;
            const { newInformationKey } = ctx.request.body;

            await server.keyDb.updateKey(id, newInformationKey);

            ctx.body = 'OK\n';
            ctx.response.status = 200;
        },
    );

    router.get(
        '/account/:id/notes',
        validateSignature,
        async (ctx: Koa.Context) => {
            const { id } = ctx.params;

            const retrievedData = await noteRepo.find({ where: { owner: id } });
            ctx.body = 'OK\n';
            ctx.response.status = 200;
            ctx.response.body = retrievedData;
        },
    );

    const app = new Koa();
    app.proxy = true;
    app.use(compress());
    app.use(cors());
    app.use(bodyParser());
    app.use(router.routes());
    app.use(router.allowedMethods());

    return app;
}
