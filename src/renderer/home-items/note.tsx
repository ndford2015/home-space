/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, { useState } from 'react';
import RichTextEditor from 'react-rte';
import './item.global.scss';

const Note = () => {
  const [value, setValue] = useState(RichTextEditor.createEmptyValue());

  return (
    <RichTextEditor
      className="notepad-container"
      value={value}
      onChange={setValue}
    />
  );
};

export default Note;
