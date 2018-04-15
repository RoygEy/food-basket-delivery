import { Component, OnInit } from '@angular/core';
import { Helpers } from '../../models';
import { DataAreaSettings, StringColumn, GridSettings } from 'radweb';
import { SelectService } from '../../select-popup/select-service';
import { AuthService } from '../../auth/auth-service';
import { foreachEntityItem } from '../../shared/utils';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {


  confirmPassword = new StringColumn({ caption: 'אישור סיסמה', inputType: 'password' });
  helpers = new GridSettings(new Helpers(), {
    numOfColumnsInGrid: 0,
    allowUpdate: true,
    columnSettings: h => [
      h.name,
      h.phone,
      h.userName,
      h.password,
      { column: this.confirmPassword },
      h.email,
      h.address
    ],
    onValidate: h => {
      if (h)
        if (h.password.value != this.confirmPassword.value) {
          h.password.error = "הסיסמה אינה תואמת את אישור הסיסמה";
        }
    }
  });


  constructor(private dialog: SelectService,
    private auth: AuthService) {


  }

  ngOnInit() {
    this.helpers.addNewRow();
  }
  async register() {
    try {
      let foundAdmin = false;
      await foreachEntityItem(new Helpers(), h => h.isAdmin.isEqualTo(true), async h => { foundAdmin = true; });

      if (!foundAdmin)
        this.helpers.currentRow.isAdmin.value = true;


      await this.helpers._doSavingRow(this.helpers.currentRow);
      this.auth.login(this.helpers.currentRow.phone.value, this.helpers.currentRow.password.value, false);
    }
    catch (err) {

    }

  }
}
