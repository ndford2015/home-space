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
import { FaTag, FaTimes } from 'react-icons/fa';
import { ItemMeta } from 'renderer/interfaces';
import { debounce } from '../utils';
import './item.global.scss';

interface NoteItemProps {
  onChange(val: string): void;
  createTag(tag: string): void;
  removeFileTag(tagId: string): void;
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

  function useCloseTagDropdown(noteTagsRef, tagListRef, tagBtnRef) {
    useEffect(() => {
      /**
       * Alert if clicked on outside of element
       */
      function handleClickOutside(this: Document, event: MouseEvent) {
        if (
          noteTagsRef.current &&
          !noteTagsRef.current.contains(event.target) &&
          tagListRef.current &&
          !tagListRef.current.contains(event.target) &&
          tagBtnRef.current &&
          !tagBtnRef.current.contains(event.target)
        ) {
          setTagDropdownOpen(false);
        }
      }
      // Bind the event listener
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        // Unbind the event listener on clean up
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [tagListRef, noteTagsRef, tagBtnRef]);
  }

  const tagListRef = useRef(null);
  const noteTagsRef = useRef(null);
  const tagBtnRef = useRef(null);
  useCloseTagDropdown(noteTagsRef, tagListRef, tagBtnRef);

  const toggleTagDropdown = () => {
    setTagDropdownOpen(!tagDropdownOpen);
  };

  const addTagToNote = (name: string) => {
    props.createTag(name);
    setTagFilter('');
  };

  const tagFilterChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setTagFilter(e.target.value);
  };

  const tagToolbar = (
    _setCustomControlState: (key: string, value: string) => void,
    _getCustomControlState: (key: string) => string,
    _editorState: EditorState
  ) => {
    const filteredTags: { id: string; name: string }[] = props.tags.filter(
      (tag) =>
        tag.name.includes(tagFilter) && !props.itemMeta.tags.includes(tag.id)
    );

    return (
      <div className="tag-toolbar">
        <div onClick={toggleTagDropdown} ref={tagBtnRef} className="tag-btn">
          <FaTag className="tag-btn-icon" />
        </div>
        {tagDropdownOpen && (
          <div className="tags-container">
            <div className="tag-list-container" ref={tagListRef}>
              <span className="available-tags">Available Tags</span>
              <input
                type="text"
                onChange={tagFilterChanged}
                value={tagFilter}
                name="tagName"
                placeholder="Search or create tag"
              />
              <div className="tag-list">
                {!!(
                  tagFilter.length &&
                  !props.tags.find((tag) => tag.name === tagFilter)
                ) && (
                  <div
                    onClick={() => addTagToNote(tagFilter)}
                  >{`Create tag '${tagFilter}'`}</div>
                )}
                {filteredTags.map((tag, i) => {
                  return (
                    <div
                      onClick={() => addTagToNote(tag.name)}
                      key={`${props.itemMeta.name}-${tag.id}`}
                    >
                      {tag.name}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="note-tags-container" ref={noteTagsRef}>
              <span className="note-tags-header">{`${props.itemMeta.name}'s Tags`}</span>
              <div className="note-tags">
                {props.itemMeta.tags.length ? (
                  props.itemMeta.tags.map((id: string) => {
                    return (
                      <div key={`note-tag-${id}`}>
                        {props.tags.find((tag) => tag.id === id)?.name}
                        <FaTimes onClick={() => props.removeFileTag(id)} />
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
