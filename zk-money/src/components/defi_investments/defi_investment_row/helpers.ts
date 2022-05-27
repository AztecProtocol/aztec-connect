import moment from 'moment';
import twoOneTick from 'images/two_ticks_one.svg';
import twoTwoTicks from 'images/two_ticks_two.svg';
import threeOneTick from 'images/three_ticks_one.svg';
import threeTwoTicks from 'images/three_ticks_two.svg';

export function getTicksIcon(filledTicks: 1 | 2, totalTicks: 2 | 3) {
  if (totalTicks == 2) {
    if (filledTicks === 1) {
      return twoOneTick;
    } else {
      return twoTwoTicks;
    }
  } else {
    if (filledTicks === 1) {
      return threeOneTick;
    } else {
      return threeTwoTicks;
    }
  }
}

export function getTimeUntilTransactionEstimation(txId: string) {
  const time = localStorage.getItem(txId);
  if (!time) {
    return '';
  }
  const estimatedTime = new Date(time);
  const nowDate = Date.now();
  const timeUntilSettle = estimatedTime.getTime() - nowDate;
  if (timeUntilSettle < 0) {
    return '';
  }
  const timeFromNow = moment(estimatedTime).fromNow(false);
  return timeFromNow.toLowerCase();
}

export function getTimeUntilNextRollup(nextPublishTime: Date) {
  const nowDate = Date.now();
  const timeUntilSettle = nextPublishTime.getTime() - nowDate;
  if (timeUntilSettle < 0) {
    return '';
  }
  const timeFromNow = moment(nextPublishTime).fromNow(false);
  return timeFromNow.toLowerCase();
}
