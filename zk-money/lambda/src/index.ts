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

exports.main = async function (event: any) {
  const { request } = event.Records[0].cf;
  const queryParams = new URLSearchParams(request.querystring) as URLSearchParams;
  const queryParamsObj = paramsToObject(queryParams.entries()) as ZkParams;
  const alias = queryParamsObj.alias;

  const response = event.Records[0].cf.response;

  let oldBody = await (await fetch('https://aztec-connect-dev.zk.money')).text();

  if (alias) {
    oldBody = oldBody.replace(
      'https://res.cloudinary.com/df4pltas6/image/upload/c_scale,w_1459/v1615319371/Share_image_4_d5v6xl.png',
      `https://res.cloudinary.com/df4pltas6/image/upload/c_scale,w_1459/g_south_east,l_e_colorize,co_white,l_text:lato_80:@${alias},x_170,y_270/v1615319371/Share_image_4_d5v6xl.png`,
    );

    oldBody = oldBody.replace(
      'Checkout zk.money by @aztecnetwork. Private DeFi is here. 🕵️.',
      `Checkout zk.money by @aztecnetwork. Private DeFi is here. Send me crypto privately @${alias} 🕵️.`,
    );
    response.headers['content-type'] = 'text/html';
    return {
      ...response,
      body: oldBody,
    };
  }
  return response;
};
