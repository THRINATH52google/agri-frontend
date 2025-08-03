import { TestBed } from '@angular/core/testing';

import { AgriApiService } from './agri-api.service';

describe('AgriApiService', () => {
  let service: AgriApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AgriApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
