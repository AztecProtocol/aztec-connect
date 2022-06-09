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

  const response = {
    status: '200',
    statusDescription: 'OK',
  };
  let oldBody = await (await fetch('https://zk.money/index.html')).text();

  if (alias) {
    oldBody = oldBody.replace(
      '$IMAGE_CONTENT',
      `https://res.cloudinary.com/df4pltas6/image/upload/c_scale,w_1459/g_south_east,l_e_colorize,co_white,l_text:lato_80:@${alias},x_90,y_200/v1615319371/Share_image_1_ohjf3m.png`,
    );
    oldBody = oldBody.replace(
      '$TEXT_CONTENT',
      `Checkout zk.money by @aztecnetwork. Private DeFi is here. Send me crypto privately @${alias} 🕵️.`,
    );
    return {
      ...response,
      body: oldBody,
    };
  } else {
    oldBody = oldBody.replace(
      '$IMAGE_CONTENT',
      `https://res.cloudinary.com/df4pltas6/image/upload/c_scale,w_1459/v1615319371/Share_image_1_ohjf3m.png`,
    );
    oldBody = oldBody.replace(
      '$TEXT_CONTENT',
      `Checkout zk.money by @aztecnetwork. Private DeFi is here. 🕵️.`,
    );
    return {
      ...response,
      body: oldBody,
    };
  }
};
