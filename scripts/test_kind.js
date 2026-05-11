const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

axios.get('http://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13&marketType=stockMkt', { responseType: 'arraybuffer' }).then(res => {
  const decodedHtml = iconv.decode(Buffer.from(res.data), 'EUC-KR');
  const $ = cheerio.load(decodedHtml);
  const firstRow = $('table tbody tr').first();
  const cols = firstRow.find('td');
  let out = [];
  cols.each((i, c) => out.push($(c).text().trim()));
  console.log(out);
});
