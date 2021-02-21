import compare from 'semver/functions/compare';
import rcompare from 'semver/functions/rcompare';

export default (arr, desc) => {
    if (!Array.isArray(arr)) {
        arr = [arr];
    }

    if (desc) {
        return arr.sort((a, b) => rcompare(a.version || '0.0.0', b.version || '0.0.0'));
    }

    return arr.sort((a, b) => compare(a.version || '0.0.0', b.version || '0.0.0'));
};
