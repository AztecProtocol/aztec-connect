import fetch from 'node-fetch';

function paramsToObject(entries: IterableIterator<[string, string]>) {
  const result: { [key: string]: string } = {};
  for (const [key, value] of entries) {
    // each 'entry' is a [key, value] tupple
    result[key] = value;
  }
  return result;
}

interface ZkParams {
  alias?: string;
}

exports.main = async function (event: any, ctx: any, callback: any) {
  const { request, response } = event.Records[0].cf;
  const queryParams = new URLSearchParams(request.querystring) as URLSearchParams;
  const queryParamsObj = paramsToObject(queryParams.entries()) as ZkParams;
  const alias = queryParamsObj.alias;
  const uri = request.uri;
  const lambdaPaths = ['/', '/index.html'];

  response.status = '200';
  response.statusDescription = 'OK';

  const hostName = request.headers.host[0].value;

  let oldBody = await (await fetch(`http://${hostName}`)).text();

  if (alias && lambdaPaths.indexOf(uri) > -1) {
    response.body = oldBody.replace(
      '$IMAGE_CONTENT',
      `https://res.cloudinary.com/df4pltas6/image/upload/c_scale,w_1459/g_south_east,l_e_colorize,co_white,l_text:lato_80:@${alias},x_170,y_270/v1615319371/Share_image_3_uo7zrx.png`,
    );
    response.body = response.body.replace(
      '$TEXT_CONTENT',
      `Checkout zk.money by @aztecnetwork. Private DeFi is here. Send me crypto privately @${alias} 🕵️.`,
    );
    response.headers['content-type'] = [
      {
        key: 'Content-Type',
        value: 'text/html; charset=utf-8',
      },
    ];
  } else if (lambdaPaths.indexOf(uri) > -1) {
    response.body = oldBody.replace(
      '$IMAGE_CONTENT',
      `https://res.cloudinary.com/df4pltas6/image/upload/c_scale,w_1459/v1615319371/Share_image_3_uo7zrx.png`,
    );
    response.body = response.body.replace(
      '$TEXT_CONTENT',
      `Checkout zk.money by @aztecnetwork. Private DeFi is here. 🕵️.`,
    );

    response.headers['content-type'] = [
      {
        key: 'Content-Type',
        value: 'text/html; charset=utf-8',
      },
    ];
  }
  callback(null, response);
};
