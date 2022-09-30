import React, { useState, useEffect } from 'react';
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
  readonly data: string;
  readonly id?: string;
}

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send: (channel: string, data?: any) => void;
        on: (channel: string, func: any) => void;
        once: (channel: string, func: any) => void;
        removeAllListeners: (channel: string) => void;
      };
    };
  }
}

const ReactGridLayout: React.ComponentClass<GridLayout.ReactGridLayoutProps> =
  WidthProvider(GridLayout);

const HomeSpace = () => {
  const [layout, setLayout] = useState<Layout[]>([]);
  const [itemMeta, setItemMeta] = useState<{ [id: string]: ItemMeta }>({});

  const getXVal = (updatedLayout: Layout[]) => {
    if (!updatedLayout.length) {
      return 0;
    }
    const prev = updatedLayout[updatedLayout.length - 1];
    const prevRight = prev.x + prev.w;

    return prevRight > 8 ? 0 : prevRight;
  };

  const addItem = (type: ItemType, name?: string, data?: string) => {
    const id: string = uuidv4();
    setItemMeta({
      ...itemMeta,
      [id]: { type, name: name || '', data: data || '' },
    });
    setLayout([
      ...layout,
      {
        i: id,
        minW: 4,
        minH: 5,
        w: 4,
        h: 8,
        x: getXVal(layout),
        y: Infinity,
      },
    ]);
  };

  const loadHome = (
    defaultItems: { name: string; data: string; id: string }[]
  ) => {
    if (defaultItems) {
      console.log('default Items: ', defaultItems);
      const defaultLayout: Layout[] = [];
      const defaultItemMeta: { [id: string]: ItemMeta } = {};
      defaultItems.forEach((item) => {
        const id: string = uuidv4();
        const { data, name } = item;
        const nameNoExt = name.replace(/(\..*)$/i, '');
        defaultItemMeta[id] = {
          type: ItemType.NOTE,
          name: nameNoExt,
          data,
          id: item.id,
        };
        defaultLayout.push({
          i: id,
          minW: 4,
          minH: 5,
          w: 4,
          h: 8,
          x: getXVal(defaultLayout),
          y: Infinity,
        });
      });
      setItemMeta(defaultItemMeta);
      setLayout(defaultLayout);
    }
  };

  useEffect(() => {
    window.electron.ipcRenderer.on('loadHome', loadHome);
    return () => {
      window.electron.ipcRenderer.removeAllListeners('loadHome');
    };
  });

  const openFiles = (files: { name: string; data: string; id: string }[]) => {
    if (files) {
      const updatedLayout = [...layout];
      const defaultItemMeta: { [id: string]: ItemMeta } = { ...itemMeta };
      const metaIds: Set<string> = new Set(
        Object.values(defaultItemMeta).map((val) => val.id || '')
      );
      files.forEach((item) => {
        if (metaIds.has(item.id)) {
          return;
        }
        const id: string = uuidv4();
        const { data, name } = item;
        const nameNoExt = name.replace(/(\..*)$/i, '');
        defaultItemMeta[id] = {
          type: ItemType.NOTE,
          name: nameNoExt,
          data: data.trim().replace(/[\u200B-\u200D\uFEFF]/g, ''),
          id: item.id,
        };
        updatedLayout.push({
          i: id,
          minW: 4,
          minH: 5,
          w: 4,
          h: 8,
          x: getXVal(updatedLayout),
          y: Infinity,
        });
      });
      setItemMeta(defaultItemMeta);
      setLayout(updatedLayout);
    }
  };

  useEffect(() => {
    window.electron.ipcRenderer.on('openFiles', openFiles);
    return () => {
      window.electron.ipcRenderer.removeAllListeners('openFiles');
    };
  });

  const fileSaved = (fileMeta: { id: string; layoutId: string }) => {
    setItemMeta({
      ...itemMeta,
      [fileMeta.layoutId]: {
        ...itemMeta[fileMeta.layoutId],
        id: fileMeta.id,
      },
    });
  };

  useEffect(() => {
    window.electron.ipcRenderer.on('fileSaved', fileSaved);
    return () => {
      window.electron.ipcRenderer.removeAllListeners('fileSaved');
    };
  });

  const setItemName = (newName: string, id: string) => {
    console.log('new name: ', newName);
    if (!newName) {
      return;
    }
    const prevName = itemMeta[id].name;
    window.electron.ipcRenderer.send('rename', {
      prevName,
      newName,
      layoutId: id,
    });
    setItemMeta({
      ...itemMeta,
      [id]: { ...itemMeta[id], name: newName },
    });
  };

  const openFile = () => {
    window.electron.ipcRenderer.send('open');
  };

  const saveNote = (id: string, val: string) => {
    const { name } = itemMeta[id];
    if (!name) {
      return;
    }
    window.electron.ipcRenderer.send('noteUpdate', { name, val });
  };

  const getItemByType = (type: ItemType, id: string): JSX.Element | null => {
    switch (type) {
      case ItemType.NOTE:
        return (
          <Note
            defaultVal={itemMeta[id].data}
            onChange={(val: string) => saveNote(id, val)}
          />
        );
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
          onBlur={(evt) => setItemName(evt.currentTarget.innerText, id)}
          suppressContentEditableWarning
        >
          {itemMeta[id].name}
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
      if (!itemMeta[item.i]) {
        return <div />;
      }
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
      <Menu addItem={addItem} openFile={openFile} />
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
