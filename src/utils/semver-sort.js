import compare from 'semver/functions/compare';
import rcompare from 'semver/functions/rcompare';

const VERSION_MISSING = '0.0.0';

export default (arr, desc) => {
    if (!Array.isArray(arr)) {
        arr = [arr];
    }

    if (desc) {
        return arr.sort((a, b) => rcompare(a.version || VERSION_MISSING, b.version || VERSION_MISSING));
    }

    return arr.sort((a, b) => compare(a.version || VERSION_MISSING, b.version || VERSION_MISSING));
};
