import { parseInviteFromScan } from './invite';

describe('parseInviteFromScan', () => {
  it('should parse valid friend join link', () => {
    const raw = 'https://splitter.app/friends/join?token=abcd-1234';
    const result = parseInviteFromScan(raw);
    expect(result).toEqual({ kind: 'friend', token: 'abcd-1234' });
  });

  it('should parse valid group join link', () => {
    const raw = 'http://splitter.app/groups/join?token=xyz-987';
    const result = parseInviteFromScan(raw);
    expect(result).toEqual({ kind: 'group', token: 'xyz-987' });
  });

  it('should return null for invalid protocol', () => {
    const raw = 'ftp://splitter.app/friends/join?token=abcd';
    const result = parseInviteFromScan(raw);
    expect(result).toBeNull();
  });

  it('should return null if token param is missing', () => {
    const raw = 'https://splitter.app/friends/join';
    const result = parseInviteFromScan(raw);
    expect(result).toBeNull();
  });

  it('should return null for unexpected path', () => {
    const raw = 'https://splitter.app/unknown/path?token=abcd';
    const result = parseInviteFromScan(raw);
    expect(result).toBeNull();
  });

  it('should return null for malformed URLs', () => {
    const raw = 'not-a-url';
    const result = parseInviteFromScan(raw);
    expect(result).toBeNull();
  });
});
