import React, { useState, useEffect, useCallback } from 'react';
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom';
import GridLayout, { Layout, WidthProvider } from 'react-grid-layout';
import { v4 as uuidv4 } from 'uuid';
import { FaArrowsAlt, FaTimes } from 'react-icons/fa';
import Menu from './menu/menu';
import './App.global.scss';
import { ItemType } from './constants';
import Note from './home-items/note';
import { debounce } from './utils';

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

  useEffect(() => {
    window.electron.ipcRenderer.on('defaultDir', (val) => {
      console.log('val', val);
    });
  }, []);

  const getXVal = () => {
    if (!layout.length) {
      return 1;
    }
    const prev = layout[layout.length - 1];
    const prevRight = prev.x + prev.w;

    return prevRight > 8 ? 0 : prevRight;
  };

  const addItem = (type: ItemType) => {
    const id: string = uuidv4();
    setLayout([
      ...layout,
      {
        i: id,
        minW: 4,
        minH: 5,
        w: 4,
        h: 8,
        x: getXVal(),
        y: Infinity,
      },
    ]);
    setItemMeta({
      ...itemMeta,
      [id]: { type, name: getNameByType(type) },
    });
  };

  const setItemName = (newName: string, id: string) => {
    const prevName = itemMeta[id].name;
    window.electron.ipcRenderer.send('rename', { prevName, newName });
    setItemMeta({
      ...itemMeta,
      [id]: { ...itemMeta[id], name: newName },
    });
  };

  const debouncedRename = useCallback(
    debounce((newName: string, id: string) => setItemName(newName, id), 3000),
    [itemMeta]
  );

  const saveNote = (id: string, val: string) => {
    const { name } = itemMeta[id];
    window.electron.ipcRenderer.send('noteUpdate', { name, val });
  };

  const getItemByType = (type: ItemType, id: string): JSX.Element | null => {
    switch (type) {
      case ItemType.NOTE:
        return <Note onChange={(val: string) => saveNote(id, val)} />;
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

  const getItemHeader = (id: string): JSX.Element => {
    return (
      <div className="item-header">
        <div className="drag-handle">
          <FaArrowsAlt />
        </div>
        <span
          contentEditable
          data-placeholder="Enter name here"
          onInput={(evt) => debouncedRename(evt.currentTarget.innerText, id)}
        />
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
      const itemUi: JSX.Element | null = getItemByType(type, item.i);
      if (!itemUi) {
        return <></>;
      }
      return (
        <div key={item.i} className="draggable-container">
          {getItemHeader(item.i)}
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
