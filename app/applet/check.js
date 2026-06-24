import https from 'https';

https.get("https://docs.google.com/spreadsheets/d/e/2PACX-1vRJCA617kuAjDdkxcyw8FKL_UV1X_k-QsLiDYsNasvWngS6ks38L5mfLejeTkE5c-4YMI5bpMNXvIud/pub?output=tsv", (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(data.split('\n').slice(0, 5).join('\n'));
  });
});
