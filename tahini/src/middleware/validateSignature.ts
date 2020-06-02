import Koa from 'koa';
import { Schnorr } from 'barretenberg/crypto/schnorr';
import * as encoding from 'text-encoding';

import { SignatureDb } from '../db/signature';

export default function createValidateSignature(schnorr: Schnorr, signatureDb: SignatureDb) {
    async function validateSignature(ctx: Koa.Context, next: Function) {
        let id = ctx.params.id;
        const { headers } = ctx.request;

        if (!headers['x-signature'] || !headers['x-message']) {
            ctx.response.status = 401;
            return;
        }

        const [s, e] = ctx.request.headers['x-signature'].split(';');
        const message = ctx.request.headers['x-message'];
        const savedSignature = await signatureDb.saveSignature(message);

        if (!savedSignature) {
            ctx.response.status = 401;
            return;
        }

        if (!id) {
            ({ id } = ctx.request.body);
        }

        const signature = {
            s: Buffer.from(s, 'hex'),
            e: Buffer.from(e, 'hex'),
        };

        const valid = schnorr.verifySignature(new encoding.TextEncoder().encode(message), Buffer.from(id, 'hex'), signature);
        if (!valid) {
            ctx.response.status = 401;
        } else {
            await next();
        }
    }

    return validateSignature;
}