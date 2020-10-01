import React from 'react';
import PropTypes from 'prop-types';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';

export const styles = ({ space, color, fontFamily, fontSize }: Rsg.Theme) => ({
  tableWrapper: {
    padding: [[space[4], 0]],
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHead: {
    borderBottom: [[1, color.border, 'solid']],
    fontWeight: 300,
  },
  cellHeading: {
    color: color.base,
    paddingRight: space[3],
    paddingBottom: space[2],
    textAlign: 'left',
    fontFamily: fontFamily.base,
    fontWeight: '300',
    fontSize: fontSize.small,
    whiteSpace: 'nowrap',
  },
  cell: {
    color: color.base,
    paddingRight: space[3],
    paddingTop: space[2],
    paddingBottom: space[2],
    verticalAlign: 'top',
    fontFamily: fontFamily.base,
    fontSize: fontSize.h6,
    lineHeight: 1,
    '&:last-child': {
      isolate: false,
      width: '99%',
      paddingRight: 0,
    },
    '& p:last-child': {
      isolate: false,
      marginBottom: 0,
    },
  },
});

interface TableProps extends JssInjectedProps {
  columns: {
    caption: string;
    render(row: any): React.ReactNode;
  }[];
  rows: any[];
  getRowKey(row: any): string;
}

export const TableRenderer: React.FunctionComponent<TableProps> = ({ classes, columns, rows, getRowKey }) => {
  return (
    <div className={classes.tableWrapper}>
      <table id="table-test" className={classes.table}>
        <thead className={classes.tableHead}>
          <tr>
            {columns.map(({ caption }, i) => (
              <th key={`${caption}_${i}`} className={classes.cellHeading}>
                {caption}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${getRowKey(row)}_${i}`}>
              {columns.map(({ render }, index) => (
                <td key={+index} className={classes.cell}>
                  {render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

TableRenderer.propTypes = {
  classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      caption: PropTypes.string.isRequired,
      render: PropTypes.func.isRequired,
    }).isRequired,
  ).isRequired,
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  getRowKey: PropTypes.func.isRequired,
};

export default Styled<TableProps>(styles)(TableRenderer);
