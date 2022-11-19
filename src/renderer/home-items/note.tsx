/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, {
  useState,
  useCallback,
  FormEvent,
  MouseEventHandler,
  useEffect,
  useRef,
} from 'react';
import RichTextEditor from 'react-rte';
import { EditorState } from 'draft-js';
import { stateFromMarkdown } from 'draft-js-import-markdown';
import { FaTag, FaPlus } from 'react-icons/fa';
import { ItemMeta } from 'renderer/interfaces';
import { debounce } from '../utils';
import './item.global.scss';

interface NoteItemProps {
  onChange(val: string): void;
  createTag(tag: string): void;
  itemMeta: ItemMeta;
  tags: { id: string; name: string }[];
}

const Note = (props: NoteItemProps) => {
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState('');
  const createFromString = (markup: string, format: string, options?) => {
    const contentState = stateFromMarkdown(markup, options);
    const editorState = EditorState.createWithContent(
      contentState,
      RichTextEditor.decorator
    );
    return new RichTextEditor.EditorValue(editorState, { [format]: markup });
  };

  function useCloseTagDropdown(ref) {
    useEffect(() => {
      /**
       * Alert if clicked on outside of element
       */
      function handleClickOutside(this: Document, event: MouseEvent) {
        if (ref.current && !ref.current.contains(event.target)) {
          console.log(event);
          console.log('closing');
          setTagDropdownOpen(false);
        }
      }
      // Bind the event listener
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        // Unbind the event listener on clean up
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [ref]);
  }

  const wrapperRef = useRef(null);
  useCloseTagDropdown(wrapperRef);

  const toggleTagDropdown = () => {
    console.log('toggling');
    setTagDropdownOpen(!tagDropdownOpen);
  };

  const addTagToNote = (name: string) => {
    props.createTag(name);
    console.log('clearing tag filter');
    setTagFilter('');
  };

  const tagFilterChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    console.log('setting tag filter: ', e.target.value);
    setTagFilter(e.target.value);
  };

  const tagToolbar = (
    _setCustomControlState: (key: string, value: string) => void,
    _getCustomControlState: (key: string) => string,
    _editorState: EditorState
  ) => {
    console.log('rerender the tagToolbar');
    const filteredTags: { id: string; name: string }[] = props.tags.filter(
      (tag) =>
        tag.name.includes(tagFilter) && !props.itemMeta.tags.includes(tag.id)
    );

    return (
      <div className="tag-toolbar">
        <div onClick={toggleTagDropdown} className="tag-btn">
          <FaTag className="tag-btn-icon" />
        </div>
        {tagDropdownOpen && (
          <div className="tags-container" ref={wrapperRef}>
            <div className="tag-list">
              <span className="available-tags">Available Tags</span>
              <input
                type="text"
                onChange={tagFilterChanged}
                value={tagFilter}
                name="tagName"
                placeholder="Search or create tag"
              />
              {!!(
                tagFilter.length &&
                !filteredTags.find((tag) => tag.name === tagFilter)
              ) && (
                <div
                  onClick={() => addTagToNote(tagFilter)}
                >{`Create tag '${tagFilter}'`}</div>
              )}
              {filteredTags.map((tag) => (
                <div onClick={() => addTagToNote(tag.name)} key={tag.id}>
                  {tag.name}
                </div>
              ))}
            </div>
            <div className="note-tags-container">
              <span className="note-tags-header">{`${props.itemMeta.name}'s Tags`}</span>
              <div className="note-tags">
                {props.itemMeta.tags.length ? (
                  props.itemMeta.tags.map((id: string) => {
                    return (
                      <div key={id}>
                        {props.tags.find((tag) => tag.id === id)?.name}
                      </div>
                    );
                  })
                ) : (
                  <span className="no-tags-msg">
                    Start typing or select a tag from the list to add to this
                    note
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const setDefaultVal = () => {
    const { data } = props.itemMeta;
    return data
      ? createFromString(data, 'markdown')
      : RichTextEditor.createEmptyValue();
  };

  const [value, setValue] = useState(setDefaultVal);

  const debouncedOnChange = useCallback(
    debounce(
      (val) => props.onChange(val.toString('markdown', { gfm: true })),
      3000
    ),
    [props]
  );

  const onChange = (val) => {
    setValue(val);
    debouncedOnChange(val);
  };

  return (
    <RichTextEditor
      customControls={[tagToolbar]}
      autoFocus
      className="notepad-container"
      value={value}
      onChange={onChange}
    />
  );
};

export default Note;
