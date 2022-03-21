"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInitData = void 0;
const initConfig = {
    '1': {
        initRoots: {
            initDataRoot: '27717599bd488a4f20967dbeff581a8965fa9b2ba68aa8a73c5213baedf2169d',
            initNullRoot: '1ccbf1f75b7704b101c66aef27f0ee7295d0dcc1742af9aaffb509d0dfca19a7',
            initRootsRoot: '1b20394c4e0dab9360186819141aede9dadfad9a419242f449a0e0e038b481f1',
        },
        initDataSize: 30288,
        accounts: './data/mainnet/accounts',
    },
    default: {
        initRoots: {
            initDataRoot: '11977941a807ca96cf02d1b15830a53296170bf8ac7d96e5cded7615d18ec607',
            initNullRoot: '1b831fad9b940f7d02feae1e9824c963ae45b3223e721138c6f73261e690c96a',
            initRootsRoot: '1b435f036fc17f4cc3862f961a8644839900a8e4f1d0b318a7046dd88b10be75',
        },
        initDataSize: 0,
    },
};
function getInitData(chainId) {
    var _a;
    return (_a = initConfig[chainId]) !== null && _a !== void 0 ? _a : initConfig['default'];
}
exports.getInitData = getInitData;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdF9jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvZW52aXJvbm1lbnQvaW5pdC9pbml0X2NvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxNQUFNLFVBQVUsR0FBRztJQUNqQixHQUFHLEVBQUU7UUFDSCxTQUFTLEVBQUU7WUFDVCxZQUFZLEVBQUUsa0VBQWtFO1lBQ2hGLFlBQVksRUFBRSxrRUFBa0U7WUFDaEYsYUFBYSxFQUFFLGtFQUFrRTtTQUNsRjtRQUNELFlBQVksRUFBRSxLQUFLO1FBQ25CLFFBQVEsRUFBRSx5QkFBeUI7S0FDcEM7SUFDRCxPQUFPLEVBQUU7UUFDUCxTQUFTLEVBQUU7WUFDVCxZQUFZLEVBQUUsa0VBQWtFO1lBQ2hGLFlBQVksRUFBRSxrRUFBa0U7WUFDaEYsYUFBYSxFQUFFLGtFQUFrRTtTQUNsRjtRQUNELFlBQVksRUFBRSxDQUFDO0tBQ2hCO0NBQ0YsQ0FBQztBQUVGLFNBQWdCLFdBQVcsQ0FBQyxPQUFlOztJQUN6QyxPQUFPLE1BQUEsVUFBVSxDQUFDLE9BQU8sQ0FBQyxtQ0FBSSxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDdEQsQ0FBQztBQUZELGtDQUVDIn0=