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
      `https://res.cloudinary.com/df4pltas6/image/upload/c_scale,w_1459/g_south_west,l_e_colorize,co_white,l_text:lato_60:@${alias},x_165,y_115/v1615319371/Group_206_1_orgtk1.png`,
    );
    oldBody = oldBody.replace(
      '$TEXT_CONTENT',
      `Checkout zk.money by @aztecnetwork. You can now send me crypto privately @${alias} 🕵️.`,
    );
    return {
      ...response,
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
      body: oldBody,
    };
  } else {
    oldBody = oldBody.replace(
      '$IMAGE_CONTENT',
      `https://res.cloudinary.com/df4pltas6/image/upload/c_scale,w_1459/v1615319371/Group_206_1_orgtk1.png`,
    );
    oldBody = oldBody.replace(
      '$TEXT_CONTENT',
      `Checkout zk.money by @aztecnetwork. You can now send crypto privately 🕵️.`,
    );
    return {
      ...response,
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
      body: oldBody,
    };
  }
};
