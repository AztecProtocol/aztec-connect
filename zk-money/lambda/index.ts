import fetch from 'node-fetch';

function paramsToObject(entries: any) {
  const result = {};
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
    headers: {
      'cache-control': [
        {
          key: 'Cache-Control',
          value: 'max-age=3600',
        },
      ],
      'content-type': [
        {
          key: 'Content-Type',
          value: 'text/html',
        },
      ],
    },
  };

  if (alias) {
    let oldBody = await (await fetch('https://zk.money')).text();

    oldBody = oldBody.replace(
      '$IMAGE_CONTENT',
      `https://res.cloudinary.com/df4pltas6/image/upload/g_south_west,l_e_colorize,co_white,l_text:lato_150:${alias},x_450,y_450/v1615292189/Group_203_1_xwwlem.png`,
    );
    oldBody = oldBody.replace(
      '$TEXT_CONTENT',
      `Checkout zk.money by @aztecnetwork. You can now send me crypto privately '@${alias}' 🕵️.`,
    );
    return {
      ...response,
      body: oldBody,
    };
  }

  return response;
};
