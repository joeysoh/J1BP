// Pure calculation logic extracted from Details.vue so it can be unit tested
// independently of the Vue component. Behavior is intentionally kept
// identical to the original inline implementation.

export function sumArrayAttribute(items, prop) {
  return items.reduce(function (a, b) {
    return a + b[prop];
  }, 0);
}

// Mutates each food item's `per` (cost per sharer, including SVC/GST for
// shared items) and `totalCost` (used for per-person expenditure totals).
export function computeFoodItemCosts(arrPersons, fSVC, fGST) {
  for (var i = 0; i < arrPersons.length; i++) {
    for (var j = 0; j < arrPersons[i].arrFoodItems.length; j++) {
      var item = arrPersons[i].arrFoodItems[j];
      var arrShare = item.arrShare;
      var per, svc, gst;
      if (arrShare.length > 0) {
        per = item.cost / arrShare.length;
        svc = (fSVC / 100 * per) * (arrPersons[i].hasSVC ? 1 : 0);
        gst = (fGST / 100 * (per + svc)) * (arrPersons[i].hasGST ? 1 : 0);
        per = per + svc + gst;
        item.per = per;
        item.totalCost = per * arrShare.length;
      } else {
        per = item.cost;
        svc = (fSVC / 100 * per) * (arrPersons[i].hasSVC ? 1 : 0);
        gst = (fGST / 100 * (per + svc)) * (arrPersons[i].hasGST ? 1 : 0);
        item.totalCost = per;
        per = per + svc + gst;
      }
    }
  }
}

// Builds the raw (un-netted) matrix of how much each sharer owes each payer,
// based on each food item's already-computed `per` amount.
function buildRawPaymentMatrix(arrPersons) {
  var n = arrPersons.length;
  var matrix = [];
  for (var i = 0; i < n; i++) {
    matrix.push(Array(n).fill(0));
  }

  for (var i = 0; i < arrPersons.length; i++) {
    for (var j = 0; j < arrPersons[i].arrFoodItems.length; j++) {
      var item = arrPersons[i].arrFoodItems[j];
      var arrShare = item.arrShare;
      if (arrShare.length > 0) {
        for (var k = 0; k < arrShare.length; k++) {
          if (arrShare[k] != i) {
            matrix[arrShare[k]][i] += item.per;
          }
        }
      }
    }
  }

  return matrix;
}

// Computes, for every pair of persons, the single net amount owed from one
// to the other (i.e. mutual debts are cancelled out pairwise).
export function calculatePairwisePayments(arrPersons, fSVC, fGST) {
  computeFoodItemCosts(arrPersons, fSVC, fGST);
  var matrix = buildRawPaymentMatrix(arrPersons);

  for (var i = 0; i < matrix.length - 1; i++) {
    for (var j = i + 1; j < matrix.length; j++) {
      var diff = matrix[j][i] - matrix[i][j];
      if (diff < 0) {
        matrix[j][i] = 0;
        matrix[i][j] = diff * -1;
      } else {
        matrix[j][i] = diff;
        matrix[i][j] = 0;
      }
    }
  }

  return matrix;
}

// Same net amounts as calculatePairwisePayments, but routes every payment
// through a single "banker" (the person involved in the fewest payments) so
// the group can settle up with as few transactions as possible.
export function calculateLeastTransactionPayments(arrPersons, fSVC, fGST) {
  computeFoodItemCosts(arrPersons, fSVC, fGST);
  var matrix = buildRawPaymentMatrix(arrPersons);
  var n = matrix.length;

  var arrNumberOfPayor = new Array(n).fill(0);
  for (var i = 0; i < matrix.length - 1; i++) {
    for (var j = i + 1; j < matrix.length; j++) {
      var diff = matrix[j][i] - matrix[i][j];
      if (diff < 0) {
        matrix[j][i] = 0;
        matrix[i][j] = diff * -1;
        arrNumberOfPayor[j]++;
      } else {
        matrix[j][i] = diff;
        matrix[i][j] = 0;
        arrNumberOfPayor[i]++;
      }
    }
  }

  var iBanker = arrNumberOfPayor.indexOf(Math.min(...arrNumberOfPayor));
  for (var i = 0; i < matrix.length; i++) {
    for (var j = 0; j < matrix.length; j++) {
      if (j == i || matrix[i][j] == 0 || j == iBanker || i == iBanker) {
        continue;
      }
      matrix[i][iBanker] += matrix[i][j];
      if (matrix[iBanker][i] > 0) {
        var diff2 = matrix[i][iBanker] - matrix[iBanker][i];
        if (diff2 < 0) {
          matrix[i][iBanker] = 0;
          matrix[iBanker][i] = diff2 * -1;
        } else {
          matrix[i][iBanker] = diff2;
          matrix[iBanker][i] = 0;
        }
      }

      matrix[iBanker][j] += matrix[i][j];
      if (matrix[j][iBanker] > 0) {
        var diff3 = matrix[iBanker][j] - matrix[j][iBanker];
        if (diff3 < 0) {
          matrix[iBanker][j] = 0;
          matrix[j][iBanker] = diff3 * -1;
        } else {
          matrix[iBanker][j] = diff3;
          matrix[j][iBanker] = 0;
        }
      }

      matrix[i][j] = 0;
    }
  }

  return matrix;
}
