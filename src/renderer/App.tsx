import React, { useState } from 'react';
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom';
import GridLayout, { Layout, WidthProvider } from 'react-grid-layout';
import { v4 as uuidv4 } from 'uuid';
import { FaArrowsAlt, FaTimes } from 'react-icons/fa';
import Menu from './menu/menu';
import './App.global.scss';
import { ItemType } from './constants';
import Note from './home-items/note';

interface ItemMeta {
  readonly type: ItemType;
  readonly name: string;
}

const ReactGridLayout: React.ComponentClass<GridLayout.ReactGridLayoutProps> =
  WidthProvider(GridLayout);

const HomeSpace = () => {
  const [layout, setLayout] = useState<Layout[]>([]);
  const [itemMeta, setItemMeta] = useState<{ [id: string]: ItemMeta }>({});

  const getNameByType = (type: ItemType): string => {
    switch (type) {
      case ItemType.NOTE:
        return 'Note';
      default:
        return '';
    }
  };

  const addItem = (type: ItemType) => {
    const id: string = uuidv4();
    setLayout([
      ...layout,
      {
        i: id,
        minW: 5,
        minH: 5,
        w: 5,
        h: 8,
        x: (layout.length % 2) * 5,
        y: Infinity,
      },
    ]);
    setItemMeta({
      ...itemMeta,
      [id]: { type, name: getNameByType(type) },
    });
  };

  const getItemByType = (type: ItemType): JSX.Element | null => {
    switch (type) {
      case ItemType.NOTE:
        return <Note />;
      default:
        return null;
    }
  };

  const removeItem = (id: string): void => {
    setLayout(layout.filter((item) => item.i !== id));
    const updatedTypes = { ...itemMeta };
    delete updatedTypes[id];
    setItemMeta(updatedTypes);
  };

  const getItemHeader = (meta: ItemMeta, id: string): JSX.Element => {
    return (
      <div className="item-header">
        <div className="drag-handle">
          <FaArrowsAlt />
        </div>
        <span
          contentEditable
          data-placeholder="Enter name here"
          onChange={(evt) =>
            setItemMeta({
              ...itemMeta,
              [id]: { ...itemMeta[id], name: evt.currentTarget.innerHTML },
            })
          }
        >
          {meta.name}
        </span>
        <FaTimes
          onClick={() => removeItem(id)}
          className="remove-item-button"
        />
      </div>
    );
  };

  const getItems = (): JSX.Element[] => {
    return layout.map((item) => {
      const { type } = itemMeta[item.i];
      const itemUi: JSX.Element | null = getItemByType(type);
      if (!itemUi) {
        return <></>;
      }
      return (
        <div key={item.i} className="draggable-container">
          {getItemHeader(itemMeta[item.i], item.i)}
          {itemUi}
        </div>
      );
    });
  };

  return (
    <>
      <Menu addItem={addItem} />
      <ReactGridLayout
        className="layout"
        onLayoutChange={setLayout}
        layout={layout}
        cols={12}
        rowHeight={30}
        width={1200}
        draggableHandle=".drag-handle"
      >
        {getItems()}
      </ReactGridLayout>
    </>
  );
};

export default function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" component={HomeSpace} />
      </Switch>
    </Router>
  );
}
