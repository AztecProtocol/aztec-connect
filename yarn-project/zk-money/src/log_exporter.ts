import jsan from 'jsan';

interface Log {
  fn: string;
  args: any;
}

(window as any).handleLogsInZkMoney = async (logs: Log[]) => {
  const strLogs = jsan.stringify(logs);
  const element = document.createElement('a');
  element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(strLogs));
  element.setAttribute('download', `zkmoney_logs_${Date.now()}.json`);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};
